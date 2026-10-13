/** Lets the history dialog finish a pending job save before it reads the log. */

let flushImpl: (() => Promise<void>) | null = null;
const savedListeners = new Set<() => void>();

export function registerJobSaveFlush(fn: () => Promise<void>): () => void {
  flushImpl = fn;
  return () => {
    if (flushImpl === fn) flushImpl = null;
  };
}

export function flushJobSave(): Promise<void> {
  return flushImpl ? flushImpl() : Promise.resolve();
}

export function onJobSaved(listener: () => void): () => void {
  savedListeners.add(listener);
  return () => {
    savedListeners.delete(listener);
  };
}

export function notifyJobSaved(): void {
  savedListeners.forEach((listener) => listener());
}

let technicianLabel: { jobId: string; names: string } | null = null;
const technicianListeners = new Set<(jobId: string, names: string) => void>();

/** Job Information reads this so the technician line matches the checkboxes. */
export function setLiveTechnicianLabel(jobId: string, names: string): void {
  technicianLabel = { jobId, names };
  technicianListeners.forEach((listener) => listener(jobId, names));
}

export function subscribeTechnicianLabel(
  jobId: string,
  listener: (names: string) => void
): () => void {
  const wrapped = (id: string, names: string) => {
    if (id === jobId) listener(names);
  };
  technicianListeners.add(wrapped);
  if (technicianLabel?.jobId === jobId) listener(technicianLabel.names);
  return () => {
    technicianListeners.delete(wrapped);
  };
}
