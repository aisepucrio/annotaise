import { redirect } from "next/navigation";

type BackgroundFormPageProps = {
  params: Promise<{ labeling_id: string }>;
};

export default async function BackgroundFormPage({
  params,
}: BackgroundFormPageProps) {
  const { labeling_id } = await params;
  redirect(`/labelings_manage/${labeling_id}/form`);
}
