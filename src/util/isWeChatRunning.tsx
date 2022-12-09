import open from "open"

export const isWeChatRunning = async (): Promise<boolean> => {
  try {
    await open.openApp('WeChat' || '微信')
     return true
  } catch (e) {
    return false
  }
};

