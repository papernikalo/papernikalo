import { listCustomExams, listStenoDictations, listTypingPassages } from "@/lib/practice-content";

export async function GET() {
  try {
    const [typing, steno, exams] = await Promise.all([
      listTypingPassages(),
      listStenoDictations(),
      listCustomExams(),
    ]);
    return Response.json(
      {
        typing: typing.map(({ title, text, language, examId, minutes }) => ({ title, text, language, examId, minutes })),
        steno: steno.map(({ id, title, english, hindi, topic }) => ({ id, title, english, hindi, topic })),
        exams,
      },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  } catch {
    return Response.json({ typing: [], steno: [], exams: [] }, { headers: { "Cache-Control": "no-store" } });
  }
}
