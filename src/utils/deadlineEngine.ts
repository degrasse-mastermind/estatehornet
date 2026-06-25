import { deadlineRuleConfig } from "../data/constants";
import type { Matter, Task } from "../types";
import { addDays, addMonths, makeId, nowIso } from "./date";

function task(input: Omit<Task, "id" | "createdAt" | "updatedAt" | "status" | "assignedTo"> & Pick<Partial<Task>, "status" | "assignedTo">): Task {
  const stamp = nowIso();
  return {
    id: makeId("task"),
    status: "not started",
    assignedTo: input.assignedTo || "Unassigned",
    createdAt: stamp,
    updatedAt: stamp,
    ...input,
  };
}

export function matterHasCtRealEstate(matter: Pick<Matter, "assets">) {
  return matter.assets.some((asset) => asset.assetType === "real estate" && asset.ctRealEstate === "yes");
}

export function generateEstateDeadlines(matter: Matter): Task[] {
  const assignedTo = matter.assignedParalegal || "Unassigned";
  const tasks: Task[] = [];

  if (matter.dateOfDeath) {
    tasks.push(task({
      title: "Review/file will and opening petition packet",
      description: "Review original will availability, interested parties, fiduciary information, and opening petition packet. Attorney/paralegal review required.",
      dueDate: addDays(matter.dateOfDeath, deadlineRuleConfig.openingPacketDaysAfterDeath),
      source: "Date of death + configurable opening target",
      priority: "high",
      category: "court filing",
      assignedTo,
    }));

    tasks.push(task({
      title: "CT-706 NT / CT estate tax return review and filing deadline",
      description: "Review whether CT-706 NT or CT-706/709 is required. Attorney/paralegal review required.",
      dueDate: addMonths(matter.dateOfDeath, deadlineRuleConfig.ctEstateTaxMonthsAfterDeath),
      source: "Date of death + configurable CT estate tax review target",
      priority: "high",
      category: "tax",
      assignedTo,
    }));
  }

  if (matter.appointmentDate) {
    tasks.push(task({
      title: "Prepare and file PC-2407 Inventory",
      description: "Prepare inventory of probate assets and supporting values. Attorney/paralegal review required.",
      dueDate: addMonths(matter.appointmentDate, deadlineRuleConfig.inventoryMonthsAfterAppointment),
      source: "Appointment date + configurable inventory target",
      priority: "high",
      category: "court filing",
      assignedTo,
    }));

    if (matterHasCtRealEstate(matter)) {
      tasks.push(task({
        title: "File/record PC-251 Notice for Land Records",
        description: "Connecticut real estate detected. Review whether PC-251 land records notice is required.",
        dueDate: addMonths(matter.appointmentDate, deadlineRuleConfig.landRecordsMonthsAfterAppointment),
        source: "Appointment date + Connecticut real estate indicator",
        priority: "high",
        category: "real estate",
        assignedTo,
      }));
    }

    tasks.push(task({
      title: "One-year estate status review",
      description: "Review matter status, open tasks, client/court bottlenecks, accounting, tax, and distribution posture.",
      dueDate: addMonths(matter.appointmentDate, deadlineRuleConfig.longOpenReviewMonthsAfterAppointment),
      source: "Appointment date + configurable status review target",
      priority: "normal",
      category: "internal",
      assignedTo,
    }));
  }

  if (matter.claimPeriodStartDate) {
    tasks.push(task({
      title: "Creditor claim period ends",
      description: "Track end of creditor claim period. Review claims and creditor notices.",
      dueDate: addDays(matter.claimPeriodStartDate, deadlineRuleConfig.creditorClaimPeriodDays),
      source: "Claim period start + configurable claim period",
      priority: "normal",
      category: "creditor",
      assignedTo,
    }));

    tasks.push(task({
      title: "Prepare/file PC-237 Return of Claims and List of Notified Creditors",
      description: "Prepare creditor return/list after claim period. Attorney/paralegal review required.",
      dueDate: addDays(matter.claimPeriodStartDate, deadlineRuleConfig.pc237DaysAfterClaimStart),
      source: "Claim period start + configurable PC-237 target",
      priority: "high",
      category: "creditor",
      assignedTo,
    }));
  }

  return tasks;
}
