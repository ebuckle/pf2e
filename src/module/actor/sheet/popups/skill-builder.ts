import { CharacterPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/types";

export class SkillBuilderPopup extends Application {
    constructor(private actor: CharacterPF2e) {
        super();
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["skill-builder-popup"],
            title: game.i18n.localize("PF2E.SkillsLabel"),
            template: "systems/pf2e/templates/actors/character/skill-builder.html",
            width: "auto",
        };
    }

    override get id(): string {
        return `skill-builder-${this.actor.id}`;
    }

    override activateListeners($html: JQuery): void {
        super.activateListeners($html);
        const { actor } = this;

        $html.find("div[data-tooltip-content]").tooltipster({
            contentAsHTML: true,
            arrow: false,
            debug: BUILD_MODE === "development",
            interactive: true,
            side: ["bottom"],
            theme: "crb-hover",
        });

        $html.find("div.tooltip").tooltipster();

        $html.find<HTMLInputElement>("input[type=text], input[type=number]").on("focus", (event) => {
            event.currentTarget.select();
        });

        $html.find<HTMLInputElement>("input[data-property]").on("blur", async (event) => {
            const $input = $(event.target);
            const propertyPath = $input.attr("data-property") ?? "";
            await actor.update({ [propertyPath]: $input.val() });
        });

        $html.find("button[data-action=close]").on("click", () => {
            this.close();
        });
    }

    override async getData(options: Partial<FormApplicationOptions> = {}): Promise<PopupData> {
        const { actor } = this;
        const build = actor.system.build.abilities;

        return {
            ...(await super.getData(options)),
            actor,
            skills: CONFIG.PF2E.skills,
            manual: build.manual,
            levelSkillData: {},
        };
    }

    /** Remove this application from the actor's apps on close */
    override async close(options: { force?: boolean } = {}): Promise<void> {
        delete this.actor.apps[this.appId];
        return super.close(options);
    }
}

interface PopupData {
    actor: CharacterPF2e;
    skills: Record<SkillAbbreviation, string>;
    manual: boolean;
    levelSkillData: Record<number, SkillData>;
}

interface SkillData {
    increase: {
        skills: { skill: string; taken: boolean }[];
        full: boolean;
        eligible: boolean;
        remaining: number;
    };
    training: {
        skills: { skill: string; taken: boolean }[];
        full: boolean;
        eligible: boolean;
        remaining: number;
    };
    eligible: boolean;
}
