'use client';

import Link from 'next/link';
import { CalendarDays, Users, FlaskConical, MoreHorizontal } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ProjectStatusBadge } from './project-status-badge';
import { formatDate } from '@/lib/utils';
import type { Project } from '@/types/project';

interface ProjectCardProps {
  project: Project;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
  onArchive?: (id: string) => void;
}

export function ProjectCard({ project, onEdit, onDelete, onArchive }: ProjectCardProps) {
  return (
    <Link href={`/projects/${project.id}`}>
      <Card className="h-full cursor-pointer transition-shadow hover:shadow-2">
        <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{project.name}</CardTitle>
            <p className="text-xs text-foreground-secondary mt-0.5">{project.code}</p>
          </div>
          <div className="flex items-center gap-2 ml-2">
            <ProjectStatusBadge status={project.status} />
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e: React.MouseEvent) => e.preventDefault()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onEdit?.(project.id)}>Edit</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onArchive?.(project.id)}>Archive</DropdownMenuItem>
                <DropdownMenuItem className="text-error" onClick={() => onDelete?.(project.id)}>Delete</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent>
          {project.description && (
            <p className="text-sm text-foreground-secondary line-clamp-2 mb-3">{project.description}</p>
          )}
          <div className="flex items-center gap-4 text-xs text-foreground-secondary">
            <span className="flex items-center gap-1">
              <CalendarDays className="h-3.5 w-3.5" />
              {formatDate(project.start_date)} - {formatDate(project.end_date)}
            </span>
            <span className="flex items-center gap-1">
              <FlaskConical className="h-3.5 w-3.5" />
              {project.study_count} studies
            </span>
            {project.team_count !== undefined && (
              <span className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5" />
                {project.team_count}
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
