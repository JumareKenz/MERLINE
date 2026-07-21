'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { API } from '@/lib/api-client';
import { toast } from 'sonner';
import type { CreateQuestionnaireDto, UpdateQuestionnaireDto, CreateSectionDto, UpdateSectionDto, CreateQuestionDto, UpdateQuestionDto, CreateOptionDto, UpdateOptionDto, QuestionnaireFilterParams } from '@/types/questionnaire';

export function useQuestionnaires(params?: QuestionnaireFilterParams) {
  return useQuery({
    queryKey: ['questionnaires', 'list', params],
    queryFn: () => API.questionnaires.list(params),
  });
}

export function useQuestionnaire(id: string) {
  return useQuery({
    queryKey: ['questionnaires', 'detail', id],
    queryFn: () => API.questionnaires.get(id),
    enabled: !!id,
  });
}

export function useCreateQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateQuestionnaireDto) => API.questionnaires.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire created successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create questionnaire');
    },
  });
}

export function useUpdateQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuestionnaireDto }) =>
      API.questionnaires.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      queryClient.invalidateQueries({ queryKey: ['questionnaires', 'detail', variables.id] });
      toast.success('Questionnaire updated successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to update questionnaire');
    },
  });
}

export function useDeleteQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.questionnaires.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to delete questionnaire');
    },
  });
}

export function useCloneQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { title: string } }) =>
      API.questionnaires.clone(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire cloned successfully');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to clone questionnaire');
    },
  });
}

export function usePublishQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.questionnaires.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire published');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to publish questionnaire');
    },
  });
}

export function useArchiveQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => API.questionnaires.archive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire archived');
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to archive questionnaire');
    },
  });
}

export function useAddSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ qnrId, data }: { qnrId: string; data: CreateSectionDto }) =>
      API.questionnaires.sections.create(qnrId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires', 'detail', variables.qnrId] });
      toast.success('Section added');
    },
  });
}

export function useUpdateSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: UpdateSectionDto }) =>
      API.questionnaires.sections.update(sectionId, data),
    onSuccess: () => toast.success('Section updated'),
  });
}

export function useRemoveSection() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sectionId: string) => API.questionnaires.sections.delete(sectionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Section removed');
    },
  });
}

export function useReorderSections() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ qnrId, data }: { qnrId: string; data: { section_ids: string[] } }) =>
      API.questionnaires.sections.reorder(qnrId, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires', 'detail', variables.qnrId] });
    },
  });
}

export function useAddQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: CreateQuestionDto }) =>
      API.questionnaires.questions.create(sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Question added');
    },
  });
}

export function useUpdateQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: UpdateQuestionDto }) =>
      API.questionnaires.questions.update(questionId, data),
    onSuccess: () => toast.success('Question updated'),
  });
}

export function useRemoveQuestion() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (questionId: string) => API.questionnaires.questions.delete(questionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Question removed');
    },
  });
}

export function useReorderQuestions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ sectionId, data }: { sectionId: string; data: { question_ids: string[] } }) =>
      API.questionnaires.questions.reorder(sectionId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
    },
  });
}

export function useAddOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ questionId, data }: { questionId: string; data: CreateOptionDto }) =>
      API.questionnaires.options.create(questionId, data),
    onSuccess: () => toast.success('Option added'),
  });
}

export function useUpdateOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ optionId, data }: { optionId: string; data: UpdateOptionDto }) =>
      API.questionnaires.options.update(optionId, data),
    onSuccess: () => toast.success('Option updated'),
  });
}

export function useRemoveOption() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (optionId: string) => API.questionnaires.options.delete(optionId),
    onSuccess: () => toast.success('Option removed'),
  });
}

export function useExportQuestionnaire() {
  return useMutation({
    mutationFn: ({ id, format }: { id: string; format?: 'json' | 'xlsx' | 'xml' }) =>
      API.questionnaires.export(id, format),
  });
}

export function useImportQuestionnaire() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { data: any; studyId: string }) => API.questionnaires.import(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['questionnaires'] });
      toast.success('Questionnaire imported successfully');
    },
  });
}
