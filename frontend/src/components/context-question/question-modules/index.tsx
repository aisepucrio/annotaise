import type {
  AdminQuestionModuleData,
  QuestionDataType,
  QuestionModule,
  ResponseQuestionModuleData,
  UserQuestionModuleData,
} from '../types';
import TextQuestionModule from './Text';
import NumberQuestionModule from './Number';
import LinearScaleQuestionModule from './LinearScale';
import MultipleChoiceQuestionModule from './MultipleChoice';
import EmailQuestionModule from './Email';

export const questionModules: Record<QuestionDataType, QuestionModule> = {
  text: TextQuestionModule,
  number: NumberQuestionModule,
  'linear-scale': LinearScaleQuestionModule,
  'multiple-choice': MultipleChoiceQuestionModule,
  email: EmailQuestionModule,
};

type RenderQuestionModuleArgs =
  | {
      dataType: QuestionDataType;
      pageType: 'admin-form';
      props: AdminQuestionModuleData;
    }
  | {
      dataType: QuestionDataType;
      pageType: 'user-labeling';
      props: UserQuestionModuleData;
    }
  | {
      dataType: QuestionDataType;
      pageType: 'response-visualization';
      props: ResponseQuestionModuleData;
    };

export function renderQuestionModule(args: RenderQuestionModuleArgs) {
  const selectedModule = questionModules[args.dataType] ?? questionModules.text;

  if (args.pageType === 'admin-form') {
    const Component = selectedModule.AdminForm;
    return <Component {...args.props} dataType={args.dataType} pageType="admin-form" />;
  }

  if (args.pageType === 'user-labeling') {
    const Component = selectedModule.UserLabeling;
    return <Component {...args.props} dataType={args.dataType} pageType="user-labeling" />;
  }

  const Component = selectedModule.ResponseVisualization;
  return <Component {...args.props} dataType={args.dataType} pageType="response-visualization" />;
}

export { TextQuestionModule, NumberQuestionModule, LinearScaleQuestionModule, MultipleChoiceQuestionModule, EmailQuestionModule };
