import { redirect } from "next/navigation";

type PageProps = {
  params: Promise<{ labeling_id: string }>;
};

export default async function LabelingRootPage({ params }: PageProps) {
  const { labeling_id } = await params;
  redirect(`/labelings_manage/${labeling_id}/form`);
}
