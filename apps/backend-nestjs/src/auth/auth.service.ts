import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../database/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { FieldLoginDto } from './dto/field-login.dto';
import { expiresInSeconds, jwtSignOptions } from './jwt.constants';
import { provisionOrganizationRoles } from './organization-provisioning';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async register(dto: RegisterDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email is already registered');
    }

    const slug = dto.orgName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const emailVerificationToken = uuidv4();

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          id: uuidv4(),
          name: dto.orgName,
          slug,
        },
      });

      // The organization's permission catalogue and standard roles, with
      // their grants. Without this the new administrator role granted
      // nothing and every permission-checked route answered 403.
      const roleIds = await provisionOrganizationRoles(tx, organization.id);
      const role = await tx.role.findUniqueOrThrow({
        where: { id: roleIds.get('administrator') as string },
      });

      const passwordHash = await bcrypt.hash(dto.password, 12);

      const user = await tx.user.create({
        data: {
          id: uuidv4(),
          email: dto.email,
          passwordHash,
          firstName: dto.firstName,
          lastName: dto.lastName,
          organizationId: organization.id,
          emailVerificationToken,
          emailVerificationTokenExpiresAt: new Date(
            Date.now() + 24 * 60 * 60 * 1000,
          ),
        },
      });

      await tx.roleUser.create({
        data: {
          userId: user.id,
          roleId: role.id,
        },
      });

      return { user, role, organization };
    });

    const token = await this.generateToken(result.user);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
        roles: [result.role.name],
        emailVerificationToken,
      },
      token: {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
      },
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: {
        roles: {
          include: {
            role: true,
          },
        },
      },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    const isPasswordValid = await bcrypt.compare(
      dto.password,
      user.passwordHash,
    );
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((ru) => ru.role.name),
      },
      token: {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
      },
    };
  }

  /**
   * Field-worker sign-in: exchange an admin-issued access code for a normal
   * session. Same token shape as email/password login — the field app is
   * still just a normal authenticated client afterward, subject to the same
   * tenancy and permission guards as everyone else. Codes are generated as
   * XXXXX-XXXXX; this accepts the code with or without the dash and
   * whitespace, uppercased, so a field worker typing it on a phone doesn't
   * get tripped up by formatting.
   */
  async fieldLogin(dto: FieldLoginDto) {
    const normalized = dto.code.trim().toUpperCase().replace(/\s+/g, '');
    const code =
      !normalized.includes('-') && normalized.length === 10
        ? `${normalized.slice(0, 5)}-${normalized.slice(5)}`
        : normalized;

    const user = await this.prisma.user.findUnique({
      where: { fieldAccessCode: code },
      include: { roles: { include: { role: true } } },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid or expired access code');
    }
    if (!user.isActive) {
      throw new UnauthorizedException('Account is inactive');
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    const token = await this.generateToken(user);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        roles: user.roles.map((ru) => ru.role.name),
      },
      token: {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
      },
    };
  }

  async logout(userId: string) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { tokenVersion: { increment: 1 } },
    });
    return { message: 'Logged out successfully' };
  }

  async refresh(userId: string) {
    const dbUser = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    if (!dbUser || !dbUser.isActive) {
      throw new UnauthorizedException('User not found or inactive');
    }

    const token = await this.generateToken(dbUser);

    return {
      user: {
        id: dbUser.id,
        email: dbUser.email,
        firstName: dbUser.firstName,
        lastName: dbUser.lastName,
        roles: dbUser.roles.map((ru) => ru.role.name),
      },
      token: {
        accessToken: token.accessToken,
        expiresIn: token.expiresIn,
      },
    };
  }

  async forgotPassword(dto: ForgotPasswordDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      return {
        message: 'If that email exists, a password reset link has been sent',
      };
    }

    const resetToken = uuidv4();
    const resetTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordTokenExpiresAt: resetTokenExpiresAt,
      },
    });

    return {
      message: 'If that email exists, a password reset link has been sent',
      ...(process.env.NODE_ENV !== 'production' && { resetToken }),
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException('Passwords do not match');
    }

    const user = await this.prisma.user.findFirst({
      where: {
        resetPasswordToken: dto.token,
        resetPasswordTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        passwordHash,
        resetPasswordToken: null,
        resetPasswordTokenExpiresAt: null,
        tokenVersion: { increment: 1 },
      },
    });

    return { message: 'Password reset successfully' };
  }

  async verifyEmail(dto: VerifyEmailDto) {
    const user = await this.prisma.user.findFirst({
      where: {
        emailVerificationToken: dto.token,
        emailVerificationTokenExpiresAt: { gt: new Date() },
      },
    });

    if (!user) {
      throw new BadRequestException('Invalid or expired verification token');
    }

    if (user.emailVerifiedAt) {
      return { message: 'Email already verified' };
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationTokenExpiresAt: null,
      },
    });

    return { message: 'Email verified successfully' };
  }

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        organization: {
          select: { id: true, name: true, slug: true },
        },
        roles: {
          include: {
            role: {
              include: { permissions: { include: { permission: true } } },
            },
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    // Effective permission slugs, resolved exactly as PermissionGuard does
    // (roles from the user's own organization only). Lets the UI hide what
    // the API would refuse anyway; the API remains the authority.
    const permissions = [
      ...new Set(
        user.roles
          .filter((ru) => ru.role.organizationId === user.organizationId)
          .flatMap((ru) => ru.role.permissions.map((rp) => rp.permission.slug)),
      ),
    ].sort();

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      isActive: user.isActive,
      emailVerifiedAt: user.emailVerifiedAt,
      lastLoginAt: user.lastLoginAt,
      organization: user.organization,
      roles: user.roles.map((ru) => ({
        id: ru.role.id,
        name: ru.role.name,
        slug: ru.role.slug,
      })),
      permissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.locale !== undefined && { locale: dto.locale }),
      },
      include: {
        roles: {
          include: { role: true },
        },
      },
    });

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      locale: user.locale,
      roles: user.roles.map((ru) => ({
        id: ru.role.id,
        name: ru.role.name,
        slug: ru.role.slug,
      })),
    };
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    if (dto.newPassword !== dto.newPasswordConfirmation) {
      throw new BadRequestException('New passwords do not match');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      dto.currentPassword,
      user.passwordHash,
    );

    if (!isCurrentPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 12);

    await this.prisma.user.update({
      where: { id: userId },
      data: { passwordHash },
    });

    return { message: 'Password changed successfully' };
  }

  private async generateToken(user: {
    id: string;
    email: string;
    organizationId?: string;
    tokenVersion?: number;
  }) {
    const dbUser =
      user.tokenVersion !== undefined
        ? user
        : await this.prisma.user.findUnique({
            where: { id: user.id },
            select: { tokenVersion: true },
          });

    const payload = {
      sub: user.id,
      email: user.email,
      orgId: user.organizationId,
      tkn: dbUser?.tokenVersion ?? 0,
    };

    // Sign with the shared options so issuer/audience match what
    // JwtStrategy verifies, and so the duration string is not mangled by
    // parseInt. `expiresIn` is returned separately, in seconds, for clients.
    const configured = this.configService.get<string>('jwt.expiresIn');
    const accessToken = await this.jwtService.signAsync(
      payload,
      jwtSignOptions(configured),
    );

    return { accessToken, expiresIn: expiresInSeconds(configured) };
  }
}
