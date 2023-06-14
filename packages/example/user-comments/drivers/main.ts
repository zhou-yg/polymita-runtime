import {
  compose,
  computed,
  connectModel,
  inputComputeInServer,
  progress,
  state,
} from "tarat/core";
import login from "./compose/login";
import topic from "./compose/topic";

export default function main() {
  const s = state(0);
  const loginHook = compose(login);
  const userDataProgress = progress(loginHook.userData);

  const notLogin = computed(() => {
    return !loginHook.alreadyLogin() && userDataProgress().state === "idle";
  });

  const topicResult = compose(topic);
  connectModel(topicResult.writeTopics, () => {
    return {
      user: {
        connect: {
          id: loginHook.userData()?.id,
        },
      },
    };
  });

  const removeTopic = inputComputeInServer(async function (id: number) {
    await topicResult.writeTopics.remove(id);
  });

  return {
    userData: loginHook.userData,
    s,
    notLogin,
    add: login.add,
    ...topicResult,
    removeTopic,
  };
}

