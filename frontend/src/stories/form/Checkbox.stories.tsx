import type { Meta, StoryObj } from '@storybook/nextjs-vite';
import { useState } from 'react';
import Checkbox from '@/components/form/Checkbox';

const meta = {
  component: Checkbox,
  tags: ['autodocs'],
  parameters: {
    layout: 'centered',
  },
  args: {
    id: 'checkbox-playground',
    variant: 'square',
    hoverColor: 'var(--blueberry-500)',
    checkedColor: 'var(--blueberry-700)',
    disabled: false,
  },
} satisfies Meta<typeof Checkbox>;

export default meta;

type Story = StoryObj<typeof Checkbox>;

/* =======================
   PLAYGROUND
======================= */

export const Playground: Story = {
  render: (args) => {
    const [checked, setChecked] = useState(false);
    return (
      <div className="flex w-md items-center gap-2">
        <Checkbox {...args} checked={checked} onChange={setChecked} />
        <label htmlFor={args.id} className="cursor-pointer text-sm text-metal-900">
          Aceito os termos
        </label>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: 'Componente de checkbox visual (somente o item de marcação). O layout de texto fica fora do componente.',
      },
    },
  },
};

/* =======================
   SHAPES
======================= */

export const Shapes: Story = {
  render: () => {
    const [circleChecked, setCircleChecked] = useState(true);
    const [squareChecked, setSquareChecked] = useState(false);

    return (
      <div className="flex w-md flex-col gap-3">
        <div className="flex items-center gap-2">
          <Checkbox id="checkbox-shape-circle" variant="circle" checked={circleChecked} onChange={setCircleChecked} />
          <label htmlFor="checkbox-shape-circle" className="cursor-pointer text-sm text-metal-900">
            Formato circular
          </label>
        </div>
        <div className="flex items-center gap-2">
          <Checkbox id="checkbox-shape-square" variant="square" checked={squareChecked} onChange={setSquareChecked} />
          <label htmlFor="checkbox-shape-square" className="cursor-pointer text-sm text-metal-900">
            Formato quadrado
          </label>
        </div>
      </div>
    );
  },
};

/* =======================
   CUSTOM COLORS
======================= */

export const CustomColors: Story = {
  render: () => {
    const [checked, setChecked] = useState(true);
    return (
      <div className="flex w-md items-center gap-2">
        <Checkbox
          id="checkbox-custom-colors"
          checked={checked}
          onChange={setChecked}
          hoverColor="var(--green-blueberry)"
          checkedColor="var(--red-blueberry)"
        />
        <label htmlFor="checkbox-custom-colors" className="cursor-pointer text-sm text-metal-900">
          Hover verde e marcado vermelho
        </label>
      </div>
    );
  },
};

/* =======================
   DISABLED
======================= */

export const Disabled: Story = {
  render: () => {
    return (
      <div className="flex w-md items-center gap-2">
        <Checkbox id="checkbox-disabled" checked onChange={() => {}} disabled />
        <label htmlFor="checkbox-disabled" className="text-sm text-metal-500">
          Opção desabilitada
        </label>
      </div>
    );
  },
};
