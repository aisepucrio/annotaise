import type { Meta, StoryObj } from "@storybook/nextjs";
import { Hash, Calculator, Percent } from "lucide-react";
import { useState } from "react";
import NumberInput from "./NumberInput";

const meta = {
  component: NumberInput,
  tags: ["autodocs"],
  args: {
    placeholder: "Digite um número...",
  },
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof NumberInput>;

export default meta;

/* =======================
   PLAYGROUND
======================= */

export const Playground: StoryObj<typeof NumberInput> = {
  args: {
    label: "Campo numérico",
    placeholder: "Digite um número...",
  },
  parameters: {
    docs: {
      description: {
        story:
          "Input numérico editável. Use os controles para testar diferentes propriedades.",
      },
    },
  },
};

/* =======================
   VARIANTES BÁSICAS
======================= */

export const Variants: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Quantidade"
        placeholder="Digite a quantidade..."
        icon={<Hash className="w-5 h-5" />}
      />

      <NumberInput
        label="Valor"
        placeholder="Digite o valor..."
        leftIcon={<Calculator className="w-5 h-5" />}
      />

      <NumberInput
        label="Porcentagem"
        placeholder="Digite a porcentagem..."
        icon={<Percent className="w-5 h-5" />}
        min={0}
        max={100}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Diferentes variações de inputs numéricos com ícones posicionados à direita ou esquerda.",
      },
    },
  },
};

/* =======================
   COM VALIDAÇÃO
======================= */

export const WithValidation: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Idade (min: 18, max: 100)"
        placeholder="Digite sua idade..."
        min={18}
        max={100}
      />

      <NumberInput
        label="Quantidade (mínimo 0)"
        placeholder="Digite a quantidade..."
        min={0}
      />

      <NumberInput
        label="Preço (mínimo 0)"
        placeholder="Digite o preço..."
        min={0}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story:
          "Inputs numéricos com validações de min e max. Sem autoValidate, as validações são apenas visuais no navegador.",
      },
    },
  },
};

/* =======================
   COM AUTO-VALIDAÇÃO
======================= */

export const WithAutoValidation: StoryObj<typeof NumberInput> = {
  render: () => {
    const [value1, setValue1] = useState<number | string>("");
    const [value2, setValue2] = useState<number | string>("");
    const [value3, setValue3] = useState<number | string>("");

    return (
      <div className="flex flex-col gap-6 w-96">
        <NumberInput
          label="Idade (auto-valida: 18-100)"
          placeholder="Digite sua idade..."
          min={18}
          max={100}
          value={value1}
          onChange={setValue1}
          autoValidate
        />

        <NumberInput
          label="Quantidade mínima 0 (auto-valida)"
          placeholder="Digite a quantidade..."
          min={0}
          value={value2}
          onChange={setValue2}
          autoValidate
        />

        <NumberInput
          label="Range: 0-10 (auto-valida)"
          placeholder="Digite um valor..."
          min={0}
          max={10}
          value={value3}
          onChange={setValue3}
          autoValidate
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Com autoValidate=true, o componente aplica automaticamente as validações de min e max ao alterar o valor, corrigindo valores inválidos.",
      },
    },
  },
};

/* =======================
   COM ERRO
======================= */

export const WithError: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Idade"
        placeholder="Digite sua idade..."
        value={15}
        min={18}
        error="Idade mínima é 18 anos"
        icon={<Hash className="w-5 h-5" />}
      />

      <NumberInput
        label="Quantidade"
        placeholder="Digite a quantidade..."
        value={150}
        max={100}
        error="Quantidade máxima permitida é 100"
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Inputs numéricos com mensagens de erro.",
      },
    },
  },
};

/* =======================
   DESABILITADO
======================= */

export const Disabled: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Campo desabilitado vazio"
        placeholder="Campo desabilitado..."
        disabled
      />

      <NumberInput
        label="Campo desabilitado com valor"
        value={42}
        disabled
        icon={<Hash className="w-5 h-5" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Inputs numéricos em estado desabilitado.",
      },
    },
  },
};

/* =======================
   COM TOOLTIP
======================= */

export const WithTooltip: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Idade"
        placeholder="Digite sua idade..."
        tooltip="Digite sua idade atual em anos completos"
        min={18}
      />

      <NumberInput
        label="Quantidade"
        placeholder="Digite a quantidade..."
        tooltip="A quantidade deve respeitar os limites configurados"
        required
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Inputs numéricos com tooltips informativos.",
      },
    },
  },
};

/* =======================
   OBRIGATÓRIO
======================= */

export const Required: StoryObj<typeof NumberInput> = {
  render: () => (
    <div className="flex flex-col gap-6 w-96">
      <NumberInput
        label="Campo obrigatório"
        placeholder="Digite um número..."
        required
      />

      <NumberInput
        label="Quantidade (obrigatória)"
        placeholder="Digite a quantidade..."
        required
        icon={<Hash className="w-5 h-5" />}
      />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Inputs numéricos marcados como obrigatórios.",
      },
    },
  },
};

/* =======================
   CONTROLADO (STATEFUL)
======================= */

export const Controlled: StoryObj<typeof NumberInput> = {
  render: () => {
    const [simpleValue, setSimpleValue] = useState<number | string>("");
    const [rangeValue, setRangeValue] = useState<number | string>(5);

    return (
      <div className="flex flex-col gap-6 w-96">
        <div>
          <NumberInput
            label="Valor simples"
            placeholder="Digite um número..."
            value={simpleValue}
            onChange={setSimpleValue}
          />
          <p className="mt-2 text-xs text-metal-700">
            Valor atual: {String(simpleValue) || "(vazio)"}
          </p>
        </div>

        <div>
          <NumberInput
            label="Range controlado (0-10)"
            min={0}
            max={10}
            value={rangeValue}
            onChange={setRangeValue}
            autoValidate
          />
          <p className="mt-2 text-xs text-metal-700">
            Valor atual: {String(rangeValue)}
          </p>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Exemplo de inputs numéricos controlados usando estado React. O valor é gerenciado externamente.",
      },
    },
  },
};

/* =======================
   CASOS DE USO
======================= */

export const UseCases: StoryObj<typeof NumberInput> = {
  render: () => {
    const [age, setAge] = useState<number | string>("");
    const [quantity, setQuantity] = useState<number | string>(0);
    const [price, setPrice] = useState<number | string>("");
    const [percentage, setPercentage] = useState<number | string>(50);

    return (
      <div className="flex flex-col gap-6 w-96">
        <NumberInput
          label="Idade"
          placeholder="Digite sua idade..."
          min={0}
          max={120}
          value={age}
          onChange={setAge}
          tooltip="Idade deve estar entre 0 e 120 anos"
          required
        />

        <NumberInput
          label="Quantidade em estoque"
          placeholder="0"
          min={0}
          value={quantity}
          onChange={setQuantity}
          leftIcon={<Hash className="w-5 h-5" />}
        />

        <NumberInput
          label="Preço (R$)"
          placeholder="0.00"
          min={0}
          value={price}
          onChange={setPrice}
          leftIcon={<Calculator className="w-5 h-5" />}
        />

        <NumberInput
          label="Desconto (%)"
          placeholder="0"
          min={0}
          max={100}
          value={percentage}
          onChange={setPercentage}
          autoValidate
          icon={<Percent className="w-5 h-5" />}
        />
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story:
          "Exemplos práticos de uso do NumberInput em diferentes cenários: idade, quantidade, preço e porcentagem.",
      },
    },
  },
};
