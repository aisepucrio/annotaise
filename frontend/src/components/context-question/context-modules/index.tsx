import type {
  AdminContextModuleData,
  ContextDataType,
  ContextModule,
  ResponseContextModuleData,
  UserContextModuleData,
} from '../types';
import TextContextModule from './Text';
import NumberContextModule from './Number';
import DateContextModule from './Date';
import CategoryContextModule from './Category';
import CodeContextModule from './Code';
import ImageContextModule from './Image';
import AudioContextModule from './Audio';
import VideoContextModule from './Video';
import PdfContextModule from './Pdf';

export const contextModules: Record<ContextDataType, ContextModule> = {
  text: TextContextModule,
  number: NumberContextModule,
  date: DateContextModule,
  category: CategoryContextModule,
  code: CodeContextModule,
  image: ImageContextModule,
  audio: AudioContextModule,
  video: VideoContextModule,
  pdf: PdfContextModule,
};

type RenderContextModuleArgs =
  | {
      dataType: ContextDataType;
      pageType: 'admin-form';
      props: AdminContextModuleData;
    }
  | {
      dataType: ContextDataType;
      pageType: 'user-labeling';
      props: UserContextModuleData;
    }
  | {
      dataType: ContextDataType;
      pageType: 'response-visualization';
      props: ResponseContextModuleData;
    };

export function renderContextModule(args: RenderContextModuleArgs) {
  const selectedModule = contextModules[args.dataType] ?? contextModules.text;

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

export {
  TextContextModule,
  NumberContextModule,
  DateContextModule,
  CategoryContextModule,
  CodeContextModule,
  ImageContextModule,
  AudioContextModule,
  VideoContextModule,
  PdfContextModule,
};
