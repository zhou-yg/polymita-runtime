import { compose, computed, progress, state, connectModel } from "@polymita/signal-model";
import _topic from "./compose/topic";

export default function topic() {
  const r = compose(_topic);

  // connectModel(r, () => ({}));

  return {
    ...r,
  };
}
