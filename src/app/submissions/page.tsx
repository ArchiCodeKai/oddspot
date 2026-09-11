import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SubmissionsList } from "@/components/submissions/SubmissionsList";
import { prisma } from "@/lib/db";

export default async function SubmissionsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/map");
  }

  // 只列自己的投稿；pending / rejected / active 都列出，狀態文案由 SubmissionsList 依語系顯示
  const submissions = await prisma.spot.findMany({
    where: { submittedById: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      name: true,
      nameEn: true,
      status: true,
      address: true,
      rejectReason: true,
      createdAt: true,
    },
  });

  return (
    <SubmissionsList
      submissions={submissions.map((spot) => ({
        ...spot,
        createdAt: spot.createdAt.toISOString(),
      }))}
    />
  );
}
