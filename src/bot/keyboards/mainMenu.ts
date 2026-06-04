import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";

export function getMainMenuKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text(ctx.t("btn-enter-hours"))
    .text(ctx.t("btn-calendar"))
    .row()
    .text(ctx.t("btn-status"))
    .text(ctx.t("btn-request-fix"))
    .row()
    .text(ctx.t("btn-settings"))
    .text(ctx.t("btn-help"))
    .row()
    .text(ctx.t("btn-reload"))
    .resized();
}