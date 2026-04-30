export interface HomePageState {
  readonly ready: boolean;
}

declare const Page: (options: {
  data: HomePageState;
}) => void;

Page({
  data: {
    ready: true
  }
});
