import { NavigatorScreenParams } from "@react-navigation/native";

import { AnalysisResult, ChordSegment, KeyInfo } from "../types/api";

export type MainTabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  TunerTab: undefined;
};

export type RootStackParamList = {
  Splash: undefined;
  Main: NavigatorScreenParams<MainTabParamList> | undefined;
  Analyzing: { audioUri: string };
  Results: { analysis: AnalysisResult };
  ChordDetail: {
    analysisId: string;
    chord: ChordSegment;
    progression: ChordSegment[];
    keyInfo: KeyInfo;
  };
  Settings: undefined;
};
