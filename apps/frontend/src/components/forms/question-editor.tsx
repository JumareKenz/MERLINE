'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Question, QuestionType, UpdateQuestionDto } from '@/types/questionnaire';

const questionSchema = z.object({
  label: z.string().min(1, 'Label is required'),
  help_text: z.string().optional(),
  placeholder: z.string().optional(),
  required: z.boolean().default(false),
  question_type: z.string().optional() as unknown as z.ZodString,
});

interface QuestionEditorProps {
  question: Question;
  onUpdate: (data: UpdateQuestionDto) => void;
}

export function QuestionEditor({ question, onUpdate }: QuestionEditorProps) {
  const form = useForm<z.infer<typeof questionSchema>>({
    resolver: zodResolver(questionSchema),
    defaultValues: {
      label: question.label,
      help_text: question.help_text || '',
      placeholder: question.placeholder || '',
      required: question.required,
    },
  });

  const handleBlur = () => {
    const values = form.getValues();
    onUpdate(values as unknown as UpdateQuestionDto);
  };

  return (
    <Form {...form}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs bg-primary-50 text-primary px-2 py-0.5 rounded font-medium capitalize">
            {question.question_type.replace(/_/g, ' ')}
          </span>
          {question.required && <span className="text-xs text-error">Required</span>}
        </div>

        <FormField control={form.control} name="label" render={({ field }) => (
          <FormItem><FormLabel>Question Text</FormLabel><FormControl><Input {...field} onBlur={handleBlur} /></FormControl><FormMessage /></FormItem>
        )} />
        <FormField control={form.control} name="help_text" render={({ field }) => (
          <FormItem><FormLabel>Help Text</FormLabel><FormControl><Textarea className="min-h-[60px]" {...field} onBlur={handleBlur} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="placeholder" render={({ field }) => (
          <FormItem><FormLabel>Placeholder</FormLabel><FormControl><Input {...field} onBlur={handleBlur} /></FormControl></FormItem>
        )} />
        <FormField control={form.control} name="required" render={({ field }) => (
          <FormItem className="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox checked={field.value} onCheckedChange={(v) => { field.onChange(v); handleBlur(); }} />
            </FormControl>
            <FormLabel>Required</FormLabel>
          </FormItem>
        )} />
      </div>
    </Form>
  );
}
