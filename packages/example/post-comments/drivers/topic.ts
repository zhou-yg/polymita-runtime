import {
  computed,
  connectModel,
  inputComputeInServer,
  model,
  state,
  writeModel,
  writePrisma,
} from "@polymita/signal-model";
import indexes from '@/models/indexes.json'

export { EScopeState } from "@polymita/signal-model"

export interface ITopic {
  id?: number;
  title: string;
}

export interface ITopicProps {
  id?: number;
}

export default function topic() {
  const topics = model<ITopic[]>(indexes.topic, () => ({
    orderBy: {
      createdAt: "desc",
    },
  }));

  const inputName = state("");

  const writeTopics = writePrisma(topics, () => {
    return {
      title: inputName(),
    };
  });

  const add = inputComputeInServer(function* () {
    if (inputName()) {
      yield writeTopics.create();
      inputName(() => "");
    }
  });

  return {
    topics,
    writeTopics,
    add,
    inputName,
  };
}
