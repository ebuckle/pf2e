import { CharacterPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/types";
import { SKILL_ABBREVIATIONS } from "@actor/values";
import { ZeroToFour, ZeroToTwenty } from "@module/data";

export class SkillMatrixPopup extends Application {
    constructor(private actor: CharacterPF2e) {
        super();
        actor.apps[this.appId] = this;
    }

    static override get defaultOptions(): ApplicationOptions {
        return {
            ...super.defaultOptions,
            classes: ["skill-matrix-popup"],
            title: game.i18n.localize("Skill Proficiency"),
            template: "systems/pf2e/templates/actors/character/skill-matrix.html",
            width: "auto",
            height: "auto",
        };
    }

    override get id(): string {
        return `skill-matrix-${this.actor.id}`;
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
        const build = actor.system.build.skills;

        const levels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20] as const;

        const skillData = levels.reduce((result, level) => {
            result[level] = Array.from(SKILL_ABBREVIATIONS).map((skill, index) => {
                const increased = (build.skillIncreases[level] || []).includes(skill);
                const trained = (build.skillTraining[level] || []).includes(skill);
                const previousRank = result[(level - 1) as ZeroToTwenty]?.[index]?.rank || 0;
                const canBeIncreased = () => {
                    if (previousRank === 0) return true;
                    if (previousRank === 1 && level >= 2) return true;
                    if (previousRank === 2 && level >= 7) return true;
                    if (previousRank === 3 && level >= 15) return true;
                    return false;
                };
                const rank = () => {
                    if (trained && previousRank === 0) return 1;
                    if (increased && previousRank < 4) return (previousRank + 1) as ZeroToFour;
                    return previousRank;
                };
                return {
                    increased: increased,
                    canBeIncreased: canBeIncreased(),
                    trained: trained,
                    canBeTrained: previousRank === 0,
                    rank: rank(),
                    rankLabel: game.i18n.localize("PF2E.ProficiencyLevel" + rank()),
                };
            });
            return result;
        }, {} as Record<ZeroToTwenty, SkillData[]>);

        const trainingData = levels.reduce((result, level) => {
            result[level] = {
                allowedTraining: build.allowedTraining[level],
                allowedIncreases: build.allowedIncreases[level],
                remainingTraining: build.allowedTraining[level] - (build.skillTraining[level] || []).length,
                remainingIncreases: build.allowedIncreases[level] - (build.skillIncreases[level] || []).length,
                eligible: build.allowedIncreases[level] > 0 || build.allowedTraining[level] > 0,
                skills: skillData[level],
            };
            return result;
        }, {} as Record<ZeroToTwenty, TrainingData>);

        console.log(trainingData);

        return {
            ...(await super.getData(options)),
            actor,
            manual: build.manual,
            skillAbr: Array.from(SKILL_ABBREVIATIONS),
            trainingData: trainingData,
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
    manual: boolean;
    skillAbr: SkillAbbreviation[];
    trainingData: Record<ZeroToTwenty, TrainingData>;
}

type TrainingData = {
    allowedTraining: number;
    allowedIncreases: number;
    remainingTraining: number;
    remainingIncreases: number;
    skills: SkillData[];
    eligible: boolean;
};

type SkillData = {
    canBeTrained: boolean;
    canBeIncreased: boolean;
    rank: ZeroToFour;
    increased: boolean;
    trained: boolean;
};
