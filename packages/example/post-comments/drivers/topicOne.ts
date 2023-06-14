import { computed, inputComputeInServer, model, state } from "tarat/core";
import { ITopic } from "./topic";
import indexes from '@/models/indexes.json'

export interface ITopicProps {
  id?: number;
}

function topicOne(props: ITopicProps) {
  const topicId = state(props.id);

  const topicsById = model<ITopic[]>(indexes.topic, () => {
    const tid = topicId();
    if (tid) {
      return {
        where: {
          id: tid,
        },
      };
    }
  });

  const currentTopic = computed(() => {
    return topicsById()[0];
  });

  return {
    topicId,
    currentTopic,
  };
}

export default topicOne;
