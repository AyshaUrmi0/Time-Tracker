import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth";
import { handleApiError } from "@/lib/api-error";
import { tasksService } from "@/server/services/tasks.service";
import {
  createTaskSchema,
  listTasksQuerySchema,
} from "@/features/tasks/tasks.schema";

export async function GET(req: Request) {
  try {
    await requireAuth();
    const { searchParams } = new URL(req.url);
    const query = listTasksQuerySchema.parse(Object.fromEntries(searchParams));
    const tasks = await tasksService.list(query);
    return NextResponse.json({ tasks });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireAuth();
    const body = await req.json().catch(() => ({}));
    const input = createTaskSchema.parse(body);
    const task = await tasksService.create(user, input);
    return NextResponse.json({ task }, { status: 201 });
  } catch (err) {
    return handleApiError(err);
  }
}
