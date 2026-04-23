import { AnalysisResult, ChordSegment } from "../types/api";

export type RootStackParamList = {
  Record: undefined;
  Analyzing: { audioUri: string };
  Results: { analysis: AnalysisResult };
  ChordDetail: { chord: ChordSegment; progression: ChordSegment[] };
};
