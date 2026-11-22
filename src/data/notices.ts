export type Board = {
  slug: string;
  name: string;
};

export type State = {
  slug: string;
  name: string;
};

export type Notice = {
  slug: string;
  title: string;
  organization: string;
  shortOrg: string;
  board: string;
  state: string;
  qualification: string;
  totalVacancies: number;
  advertisementNo: string;
  applicationEnd: string;
  examDate?: string;
};

export const boards: Board[] = [];

export const states: State[] = [];

export const notices: Notice[] = [];
