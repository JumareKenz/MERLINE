import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import type { ReportTemplate } from '@/types/report';

interface ReportTemplateCardProps {
  template: ReportTemplate;
  onSelect: (template: ReportTemplate) => void;
  isSelected?: boolean;
}

export function ReportTemplateCard({ template, onSelect, isSelected }: ReportTemplateCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all hover:shadow-2 ${isSelected ? 'ring-2 ring-primary' : ''}`}
      onClick={() => onSelect(template)}
    >
      <CardHeader>
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          {template.is_built_in && <Badge variant="primary" size="sm">Built-in</Badge>}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-foreground-secondary line-clamp-2">{template.description}</p>
      </CardContent>
      <CardFooter>
        <div className="flex items-center justify-between w-full">
          <Badge variant="default">{template.category}</Badge>
          <Button
            variant={isSelected ? 'default' : 'ghost'}
            size="sm"
            onClick={(e) => { e.stopPropagation(); onSelect(template); }}
          >
            {isSelected ? 'Selected' : 'Select'}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
