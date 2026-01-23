declare module "highlightjs" {
  const hljs: {
    highlightAuto: (
      code: string,
      languages?: string[]
    ) => { value: string; language?: string; relevance?: number };
  };

  export default hljs;
}
