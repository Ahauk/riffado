import { AnalysisResult } from "../types/api";

export type RootStackParamList = {
  Record: undefined;
  Analyzing: { audioUri: string };
  Results: { analysis: AnalysisResult };
};
