'use client';

import { useEffect, useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormBuilderStore } from '@/stores/form-builder-store';
import { useUpdateQuestionnaire } from '@/hooks/use-questionnaires';
import { FormBuilderToolbar } from './form-builder-toolbar';
import { QuestionTypeSelector } from './question-type-selector';
import { SectionPanel } from './section-panel';
import { CanvasQuestion } from './canvas-question';
import { QuestionEditor } from './question-editor';
import { OptionEditor } from './option-editor';
import { SkipLogicEditor } from './skip-logic-editor';
import { ValidationEditor } from './validation-editor';
import { TranslationEditor } from './translation-editor';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Plus, Save } from 'lucide-react';
import type { Section, Question, QuestionOption, CreateOptionDto } from '@/types/questionnaire';
import { toast } from 'sonner';

const genId = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

interface FormBuilderLayoutProps {
  questionnaireId: string;
  initialTitle: string;
  initialSections: Section[];
  initialQuestions: Question[];
}

export function FormBuilderLayout({
  questionnaireId,
  initialTitle,
  initialSections,
  initialQuestions,
}: FormBuilderLayoutProps) {
  const router = useRouter();
  const updateQuestionnaire = useUpdateQuestionnaire();

  const {
    questions,
    sections,
    selectedQuestionId,
    expandedSections,
    saveStatus,
    activePanel,
    setQuestions,
    setSections,
    addQuestion,
    addSection,
    updateQuestion,
    updateSection,
    removeSection,
    removeQuestion,
    selectQuestion,
    toggleSectionExpanded,
    undo,
    redo,
    setSaveStatus,
    setActivePanel,
    reset,
  } = useFormBuilderStore();

  useEffect(() => {
    setQuestions(initialQuestions);
    setSections(initialSections);
    return () => { reset(); };
  }, []);

  const selectedQuestion = questions.find((q) => q.id === selectedQuestionId);
  const unsortedQuestions = questions;
  const sortedSections = [...sections].sort((a, b) => a.order_index - b.order_index);

  const handleAddSection = useCallback(() => {
    addSection({
      id: genId(),
      questionnaire_id: questionnaireId,
      title: 'New Section',
      order_index: sections.length,
      is_repeatable: false,
      questions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [sections.length, questionnaireId, addSection]);

  const handleAddQuestion = useCallback((sectionId: string) => {
    const sectionQuestions = questions.filter((q) => q.section_id === sectionId);
    addQuestion({
      id: genId(),
      section_id: sectionId,
      code: `Q${questions.length + 1}`,
      question_type: 'text',
      label: 'New Question',
      required: false,
      order_index: sectionQuestions.length,
      options: [],
      validation_rules: [],
      skip_logic: [],
      translations: {},
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }, [questions, addQuestion]);

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      await updateQuestionnaire.mutateAsync({
        id: questionnaireId,
        data: { title: initialTitle },
      });

      const { sections: storeSections, questions: storeQuestions } = useFormBuilderStore.getState();
      const api = (await import('@/lib/api-client')).API;

      const existingSectionIds = storeSections.map((s) => s.id);

      for (const section of storeSections) {
        if (section.id.startsWith('new-') || !section.id.includes('-')) {
          await api.questionnaires.sections.create(questionnaireId, {
            title: section.title,
            description: section.description || '',
            sortOrder: section.order_index,
          });
        } else {
          await api.questionnaires.sections.update(section.id, {
            title: section.title,
            description: section.description || '',
            sortOrder: section.order_index,
          });
        }
      }

      const sectionQuestions = storeQuestions.filter((q) => existingSectionIds.includes(q.section_id));
      for (const question of sectionQuestions) {
        if (question.id.startsWith('new-') || !question.id.includes('-')) {
          const created = await api.questionnaires.questions.create(question.section_id, {
            text: question.label,
            description: question.help_text || '',
            type: question.question_type,
            sortOrder: question.order_index,
            isRequired: question.required,
          });
          const createdId = created.data.data?.id;
          if (createdId && question.options?.length) {
            for (const opt of question.options) {
              await api.questionnaires.options.create(createdId, {
                text: opt.label,
                value: opt.value,
                sortOrder: opt.order_index || 0,
              });
            }
          }
        }
      }

      setSaveStatus('saved');
      toast.success('Questionnaire saved');
    } catch {
      setSaveStatus('error');
      toast.error('Failed to save questionnaire');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      <FormBuilderToolbar
        title={initialTitle}
        onSave={handleSave}
        isSaving={saveStatus === 'saving'}
        onPreview={() => router.push(`/questionnaires/${questionnaireId}/preview`)}
      />

      <div className="flex flex-1 overflow-hidden">
        {/* Left Panel - Sections & Question Palette */}
        <div className="w-72 border-r border-border bg-background-surface overflow-y-auto p-3 shrink-0 space-y-2">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-semibold uppercase text-foreground-tertiary tracking-wider">Sections</h3>
            <Button variant="ghost" size="xs" onClick={handleAddSection}>
              <Plus className="h-3.5 w-3.5 mr-1" /> Section
            </Button>
          </div>

          {sortedSections.length === 0 && (
            <div className="text-xs text-foreground-secondary text-center py-8">
              No sections yet. Create one to get started.
            </div>
          )}

          {sortedSections.map((section) => (
            <SectionPanel
              key={section.id}
              section={section}
              questions={questions.filter((q) => q.section_id === section.id)}
              isExpanded={expandedSections.includes(section.id)}
              onToggleExpand={() => toggleSectionExpanded(section.id)}
              onUpdateTitle={(title) => updateSection(section.id, { title })}
              onRemove={() => removeSection(section.id)}
              onAddQuestion={() => handleAddQuestion(section.id)}
              onSelectQuestion={selectQuestion}
              selectedQuestionId={selectedQuestionId}
            />
          ))}
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-y-auto bg-background p-6">
          {questions.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <p className="text-sm text-foreground-secondary mb-4">No questions yet</p>
              <div className="flex gap-2">
                {sortedSections.map((s) => (
                  <Button key={s.id} variant="secondary" size="sm" onClick={() => handleAddQuestion(s.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" /> Add to &ldquo;{s.title}&rdquo;
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto space-y-3">
              {[...questions]
                .sort((a, b) => a.order_index - b.order_index)
                .map((q, i) => (
                  <CanvasQuestion
                    key={q.id}
                    questionId={q.id}
                    isSelected={selectedQuestionId === q.id}
                    onSelect={selectQuestion}
                    onDuplicate={useFormBuilderStore.getState().duplicateQuestion}
                    onDelete={removeQuestion}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Right Panel - Properties */}
        <div className="w-80 border-l border-border bg-background-surface overflow-y-auto p-4 shrink-0">
          {selectedQuestion ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold">Question Properties</h3>
                <div className="flex gap-1">
                  {(['properties', 'options', 'validation', 'skip-logic', 'translations'] as const).map((panel) => (
                    <Button
                      key={panel}
                      variant={activePanel === panel ? 'default' : 'ghost'}
                      size="xs"
                      onClick={() => setActivePanel(panel === activePanel ? null : panel)}
                    >
                      {panel === 'properties' ? 'Props' :
                       panel === 'options' ? 'Options' :
                       panel === 'validation' ? 'Valid' :
                       panel === 'skip-logic' ? 'Logic' : 'Trans'}
                    </Button>
                  ))}
                </div>
              </div>

              {(!activePanel || activePanel === 'properties') && (
                <QuestionEditor
                  question={selectedQuestion}
                  onUpdate={(updates) => updateQuestion(selectedQuestion.id, updates as unknown as Partial<Question>)}
                />
              )}

              {activePanel === 'options' && selectedQuestion.options && (
                <OptionEditor
                  options={selectedQuestion.options}
                  onAdd={(data: CreateOptionDto) => updateQuestion(selectedQuestion.id, {
                    options: [...(selectedQuestion.options || []), { id: genId(), question_id: selectedQuestion.id, label: data.text, value: data.value, order_index: (selectedQuestion.options || []).length, is_other: false, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as QuestionOption],
                  })}
                  onUpdate={(optionId, data) => updateQuestion(selectedQuestion.id, {
                    options: (selectedQuestion.options || []).map((o) => o.id === optionId ? { ...o, ...data } : o),
                  })}
                  onRemove={(optionId) => updateQuestion(selectedQuestion.id, {
                    options: (selectedQuestion.options || []).filter((o) => o.id !== optionId),
                  })}
                />
              )}

              {activePanel === 'validation' && (
                <ValidationEditor
                  rules={selectedQuestion.validation_rules || []}
                  onAdd={(rule) => updateQuestion(selectedQuestion.id, {
                    validation_rules: [...(selectedQuestion.validation_rules || []), { ...rule, id: genId(), question_id: selectedQuestion.id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() } as any],
                  })}
                  onUpdate={(id, data) => updateQuestion(selectedQuestion.id, {
                    validation_rules: (selectedQuestion.validation_rules || []).map((r) => r.id === id ? { ...r, ...data } : r),
                  })}
                  onRemove={(id) => updateQuestion(selectedQuestion.id, {
                    validation_rules: (selectedQuestion.validation_rules || []).filter((r) => r.id !== id),
                  })}
                />
              )}

              {activePanel === 'skip-logic' && (
                <SkipLogicEditor
                  rules={selectedQuestion.skip_logic || []}
                  questions={questions.map((q) => ({ id: q.id, label: q.label }))}
                  onAdd={() => updateQuestion(selectedQuestion.id, {
                    skip_logic: [...(selectedQuestion.skip_logic || []), {
                      id: genId(),
                      question_id: selectedQuestion.id,
                      condition_type: 'equals',
                      condition_value: '',
                      target_question_id: '',
                      action: 'show',
                      order_index: (selectedQuestion.skip_logic || []).length,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    }],
                  })}
                  onUpdate={(id, data) => updateQuestion(selectedQuestion.id, {
                    skip_logic: (selectedQuestion.skip_logic || []).map((r) => r.id === id ? { ...r, ...data } : r),
                  })}
                  onRemove={(id) => updateQuestion(selectedQuestion.id, {
                    skip_logic: (selectedQuestion.skip_logic || []).filter((r) => r.id !== id),
                  })}
                />
              )}

              {activePanel === 'translations' && (
                <TranslationEditor
                  translations={selectedQuestion.translations || {}}
                  onUpdate={(language, key, value) => updateQuestion(selectedQuestion.id, {
                    translations: {
                      ...(selectedQuestion.translations || {}),
                      [language]: { ...(selectedQuestion.translations?.[language] || {}), [key]: value },
                    },
                  })}
                  onAddLanguage={(language) => updateQuestion(selectedQuestion.id, {
                    translations: { ...(selectedQuestion.translations || {}), [language]: {} },
                  })}
                  onRemoveLanguage={(language) => {
                    const t = { ...(selectedQuestion.translations || {}) };
                    delete t[language];
                    updateQuestion(selectedQuestion.id, { translations: t });
                  }}
                />
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-foreground-secondary">
              Select a question to edit its properties
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
