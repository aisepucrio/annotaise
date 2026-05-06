import type { ContextModule, ResponseContextModuleProps, UserContextModuleProps } from '../types';
import { TextualContextValue } from './shared';

// =+=+=+=+= FORM
function AdminForm() {
  return null;
}

// =-=-=-=-= LABELING
function UserLabeling({ formattedValue }: UserContextModuleProps) {
  return <TextualContextValue value={formattedValue} />;
}

// =:=:=:=:= VIZUALIZATION
function ResponseVisualization({ formattedValue }: ResponseContextModuleProps) {
  return <TextualContextValue value={formattedValue} />;
}

export const CategoryContextModule: ContextModule = {
  dataType: 'category',
  AdminForm,
  UserLabeling,
  ResponseVisualization,
};

export default CategoryContextModule;
