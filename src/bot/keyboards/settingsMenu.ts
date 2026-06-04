import { Keyboard } from "grammy";
import type { MyContext } from "../../index.js";

export function getSettingsKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text(ctx.t("btn-notifications"))
    .text(ctx.t("btn-change-lang"))
    .row()
    .text(ctx.t("btn-reload"))
    .row()
    .text(ctx.t("btn-back-main"))
    .resized();
}

export function getLanguageKeyboard(ctx: MyContext) {
  return new Keyboard()
    .text("🇺🇦 Українська")
    .text("🇬🇧 English")
    .row()
    .text(ctx.t("btn-back-settings"))
    .resized();
}