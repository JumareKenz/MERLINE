import { Test, TestingModule } from '@nestjs/testing';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: jest.Mocked<AuthService>;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    logout: jest.fn(),
    refresh: jest.fn(),
    forgotPassword: jest.fn(),
    resetPassword: jest.fn(),
    verifyEmail: jest.fn(),
    getProfile: jest.fn(),
    updateProfile: jest.fn(),
    changePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        {
          provide: AuthService,
          useValue: mockAuthService,
        },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('register', () => {
    it('should call authService.register and return the result', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
        orgName: 'Test Org',
      };

      const expected = {
        user: {
          id: 'uuid',
          email: dto.email,
          firstName: dto.firstName,
          lastName: dto.lastName,
          roles: ['Administrator'],
        },
        token: {
          accessToken: 'jwt-token',
          expiresIn: '7d',
        },
      };

      mockAuthService.register.mockResolvedValue(expected);

      const result = await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('login', () => {
    it('should call authService.login and return the result', async () => {
      const dto = {
        email: 'test@example.com',
        password: 'password123',
      };

      const expected = {
        user: {
          id: 'uuid',
          email: dto.email,
          firstName: 'John',
          lastName: 'Doe',
          roles: ['Administrator'],
        },
        token: {
          accessToken: 'jwt-token',
          expiresIn: '7d',
        },
      };

      mockAuthService.login.mockResolvedValue(expected);

      const result = await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expected);
    });
  });

  describe('logout', () => {
    it('should call authService.logout', async () => {
      mockAuthService.logout.mockResolvedValue({
        message: 'Logged out successfully',
      });

      const result = await controller.logout();

      expect(authService.logout).toHaveBeenCalled();
      expect(result).toEqual({ message: 'Logged out successfully' });
    });
  });

  describe('refresh', () => {
    it('should call authService.refresh with the current user', async () => {
      const currentUser = {
        id: 'user-id',
        email: 'test@example.com',
        organizationId: 'org-id',
      };

      const expected = {
        user: {
          id: 'user-id',
          email: 'test@example.com',
          firstName: 'John',
          lastName: 'Doe',
          roles: ['Administrator'],
        },
        token: {
          accessToken: 'new-jwt-token',
          expiresIn: '7d',
        },
      };

      mockAuthService.refresh.mockResolvedValue(expected);

      const result = await controller.refresh(currentUser);

      expect(authService.refresh).toHaveBeenCalledWith(currentUser);
      expect(result).toEqual(expected);
    });
  });

  describe('forgotPassword', () => {
    it('should call authService.forgotPassword', async () => {
      const dto = { email: 'test@example.com' };

      mockAuthService.forgotPassword.mockResolvedValue({
        message: 'If that email exists, a password reset link has been sent',
      });

      const result = await controller.forgotPassword(dto);

      expect(authService.forgotPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({
        message: 'If that email exists, a password reset link has been sent',
      });
    });
  });

  describe('resetPassword', () => {
    it('should call authService.resetPassword', async () => {
      const dto = {
        token: 'reset-token',
        email: 'test@example.com',
        password: 'newpassword123',
        passwordConfirmation: 'newpassword123',
      };

      mockAuthService.resetPassword.mockResolvedValue({
        message: 'Password reset successfully',
      });

      const result = await controller.resetPassword(dto);

      expect(authService.resetPassword).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Password reset successfully' });
    });
  });

  describe('verifyEmail', () => {
    it('should call authService.verifyEmail', async () => {
      const dto = { token: 'verification-token' };

      mockAuthService.verifyEmail.mockResolvedValue({
        message: 'Email verified successfully',
      });

      const result = await controller.verifyEmail(dto);

      expect(authService.verifyEmail).toHaveBeenCalledWith(dto);
      expect(result).toEqual({ message: 'Email verified successfully' });
    });
  });

  describe('getProfile', () => {
    it('should call authService.getProfile with the current user id', async () => {
      const currentUser = { id: 'user-id' };
      const expected = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'John',
        lastName: 'Doe',
      };

      mockAuthService.getProfile.mockResolvedValue(expected);

      const result = await controller.getProfile(currentUser);

      expect(authService.getProfile).toHaveBeenCalledWith('user-id');
      expect(result).toEqual(expected);
    });
  });

  describe('updateProfile', () => {
    it('should call authService.updateProfile with current user and dto', async () => {
      const currentUser = { id: 'user-id' };
      const dto = { firstName: 'Jane' };
      const expected = {
        id: 'user-id',
        email: 'test@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
      };

      mockAuthService.updateProfile.mockResolvedValue(expected);

      const result = await controller.updateProfile(currentUser, dto);

      expect(authService.updateProfile).toHaveBeenCalledWith('user-id', dto);
      expect(result).toEqual(expected);
    });
  });

  describe('changePassword', () => {
    it('should call authService.changePassword with current user and dto', async () => {
      const currentUser = { id: 'user-id' };
      const dto = {
        currentPassword: 'oldpass123',
        newPassword: 'newpass123',
        newPasswordConfirmation: 'newpass123',
      };

      mockAuthService.changePassword.mockResolvedValue({
        message: 'Password changed successfully',
      });

      const result = await controller.changePassword(currentUser, dto);

      expect(authService.changePassword).toHaveBeenCalledWith('user-id', dto);
      expect(result).toEqual({ message: 'Password changed successfully' });
    });
  });
});
