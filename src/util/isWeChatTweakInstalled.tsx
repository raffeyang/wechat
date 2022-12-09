import * as fs from "fs"

export const isWeChatTweakInstalled = (): boolean => {
  try {
    return fs.existsSync("/usr/local/bin/wechattweak-cli")
  } catch (e) {
    console.error(String(e))
    return false
  }
}
