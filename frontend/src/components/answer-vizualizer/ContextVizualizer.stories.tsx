import type { Meta, StoryObj } from "@storybook/nextjs";
import ContextVizualizer from "./ContextVizualizer";

const meta = {
  title: "AnswerVizualizer/ContextVizualizer",
  component: ContextVizualizer,
  tags: ["autodocs"],
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Componente placeholder para contextos. Atualmente não renderiza conteúdo visual.",
      },
    },
  },
} satisfies Meta<typeof ContextVizualizer>;

export default meta;
type Story = StoryObj<typeof ContextVizualizer>;

export const Placeholder: Story = {
  args: {
    text: "Contexto de exemplo",
  },
  render: (args) => (
    <div className="w-[720px] rounded-xl border border-dashed border-metal-300 bg-white p-5">
      <ContextVizualizer {...args} />
      <p className="text-sm text-metal-600">
        Este componente está reservado para futura visualização de contextos.
      </p>
    </div>
  ),
};
