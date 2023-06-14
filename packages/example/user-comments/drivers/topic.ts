import { compose, computed, progress, state, connectModel } from "tarat/core";
import _topic from "./compose/topic";

export default function topic() {
  const r = compose(_topic);

  // connectModel(r, () => ({}));

  return {
    ...r,
  };
}
