import fs from 'node:fs/promises';
import path from 'node:path';

import GuiaContent from './GuiaContent';

export const metadata = {
  title: 'Guia do Usuário | AnnotAISE',
  description: 'Como criar projetos, importar datasets, montar formulários de anotação e resolver empates no AnnotAISE.',
};

async function loadGuide(locale: 'pt' | 'en') {
  const file = path.join(process.cwd(), 'content', `guia.${locale}.md`);
  return fs.readFile(file, 'utf8');
}

export default async function GuiaPage() {
  const [pt, en] = await Promise.all([loadGuide('pt'), loadGuide('en')]);

  return <GuiaContent pt={pt} en={en} />;
}
