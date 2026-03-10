import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { isAdmin } from '@/lib/admin';
import { prisma } from '@/lib/db';
import {
  notifyTaskApproved,
  notifyTaskRejected,
  notifyMilestoneCompleted,
  notifyAdminPendingPayout,
} from '@/lib/payments/stipend-emails';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user?.email) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }
    if (!(await isAdmin())) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const taskId = (body.taskId as string)?.trim();
    const action = (body.action as string)?.trim(); // approve, reject, request_changes
    const note = (body.note as string)?.trim() || '';

    if (!taskId || !action) {
      return NextResponse.json({ error: 'taskId and action are required' }, { status: 400 });
    }
    if (!['approve', 'reject', 'request_changes'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Use: approve, reject, request_changes' }, { status: 400 });
    }

    const task = await prisma.internTask.findUnique({
      where: { id: taskId },
      include: { fellow: { include: { user: true } }, milestone: true },
    });
    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }
    if (task.status !== 'submitted') {
      return NextResponse.json({ error: `Task must be in 'submitted' status to review. Current: ${task.status}` }, { status: 400 });
    }
    if (!task.fellowId || !task.fellow) {
      return NextResponse.json({ error: 'Task is not assigned to any fellow' }, { status: 400 });
    }

    const fellowEmail = task.fellow.user.email;
    const fellowName = task.fellow.user.name || fellowEmail.split('@')[0];

    if (action === 'approve') {
      // Update task status
      await prisma.internTask.update({
        where: { id: taskId },
        data: {
          status: 'approved',
          progress: 100,
          reviewedBy: user.email,
          reviewedAt: new Date(),
          reviewNote: note || null,
        },
      });

      // Create task-level payout if stipend exists
      if (task.stipend && task.stipend > 0) {
        await prisma.stipendPayout.create({
          data: {
            fellowId: task.fellowId,
            taskId: task.id,
            amount: task.stipend,
            status: 'pending',
            approvedBy: user.email,
            approvedAt: new Date(),
          },
        });
        // Notify admin of pending payout
        notifyAdminPendingPayout(fellowName, task.stipend, 'task').catch(console.error);
      }

      // Check if milestone is now complete (all tasks approved)
      if (task.milestoneId) {
        const allTasks = await prisma.internTask.findMany({
          where: { milestoneId: task.milestoneId },
        });
        const allApproved = allTasks.every((t) => t.status === 'approved');

        if (allApproved && task.milestone) {
          // Create milestone-level payout if stipend exists
          if (task.milestone.stipend && task.milestone.stipend > 0) {
            await prisma.stipendPayout.create({
              data: {
                fellowId: task.fellowId,
                milestoneId: task.milestoneId,
                amount: task.milestone.stipend,
                status: 'pending',
                approvedBy: user.email,
                approvedAt: new Date(),
              },
            });
            notifyAdminPendingPayout(fellowName, task.milestone.stipend, 'milestone').catch(console.error);
          }
          // Increment fellow's milestones completed
          await prisma.internFellow.update({
            where: { id: task.fellowId },
            data: { milestonesCompleted: { increment: 1 } },
          });
          // Notify intern of milestone completion
          notifyMilestoneCompleted(fellowEmail, fellowName, task.milestone.title, task.milestone.stipend).catch(console.error);
        }
      }

      // Notify intern of task approval
      notifyTaskApproved(fellowEmail, fellowName, task.title, task.stipend).catch(console.error);

      return NextResponse.json({ success: true, message: 'Task approved' });
    } else {
      // reject or request_changes
      await prisma.internTask.update({
        where: { id: taskId },
        data: {
          status: 'in_progress',
          reviewedBy: user.email,
          reviewedAt: new Date(),
          reviewNote: note || 'Changes requested by admin',
        },
      });

      notifyTaskRejected(fellowEmail, fellowName, task.title, note || 'Please review and resubmit.').catch(console.error);

      return NextResponse.json({ success: true, message: 'Task sent back for changes' });
    }
  } catch (err) {
    console.error('[admin/interns/tasks/review]', err);
    return NextResponse.json({ error: 'Failed to review task' }, { status: 500 });
  }
}
