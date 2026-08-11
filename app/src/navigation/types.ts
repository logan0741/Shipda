import type { NavigatorScreenParams } from '@react-navigation/native';

export type TabParamList = {
  HomeTab: undefined;
  HistoryTab: undefined;
  SettingsTab: undefined;
};

export type RootStackParamList = {
  Tabs: NavigatorScreenParams<TabParamList>;

  // 등록 플로우 — 상태는 FlowContext가 들고 있어 파라미터를 최소로 둔다
  ProductInfo: undefined;
  Waybill: undefined;
  BoxCapture: undefined;
  CbmResult: undefined;
  CbmManual: { reason?: string } | undefined;
  CornerAdjust: undefined;
  LabelCapture: undefined;
  IngredientResult: undefined;
  IngredientManual: undefined;
  HsCodeResult: undefined;
  PreReviewGuide: undefined;
  Summary: undefined;
  Pickup: undefined;
  Consolidation: undefined;
  Shipment: undefined;

  // 조회 / 부가
  Detail: { productId: string };
  Admin: undefined;
};

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}
