import { CharacterPF2e } from "@actor";
import { SkillAbbreviation } from "@actor/types";
import { SKILL_ABBREVIATIONS } from "@actor/values";

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

        $html.find<HTMLInputElement>("input[name=toggle-manual-mode]").on("change", async (event) => {
            if (event.originalEvent) {
                await actor.toggleAbilityManagement();
            }
        });

        $html.find("button[data-action=ancestry-boost]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(actor.ancestry?.system.boosts ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await actor.ancestry?.update({ [`data.boosts.${boostToRemove[0]}.selected`]: null });
                return;
            }

            const freeBoost = Object.entries(actor.ancestry?.system.boosts ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await actor.ancestry?.update({ [`data.boosts.${freeBoost[0]}.selected`]: ability });
            }
        });

        $html.find("button[data-action=background-boost]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");

            const boostToRemove = Object.entries(actor.background?.system.boosts ?? {}).find(
                ([, b]) => b.selected === ability
            );
            if (boostToRemove) {
                await actor.background?.update({
                    [`data.boosts.${boostToRemove[0]}.selected`]: null,
                });
                return;
            }

            const freeBoost = Object.entries(actor.background?.system.boosts ?? {}).find(
                ([, b]) => !b.selected && b.value.length > 0
            );
            if (freeBoost) {
                await actor.background?.update({
                    [`data.boosts.${freeBoost[0]}.selected`]: ability,
                });
            }
        });

        $html.find("button[data-action=class-key-ability]").on("click", async (event) => {
            const ability = $(event.currentTarget).attr("data-ability");
            if (actor.system.build.abilities.manual) {
                await actor.update({ [`data.details.keyability.value`]: ability });
            } else {
                await actor.class?.update({ [`data.keyAbility.selected`]: ability });
            }
        });

        $html.find("button[data-action=level]").on("click", async (event) => {
            const ability: AbilityString = $(event.currentTarget).attr("data-ability") as AbilityString;
            const level = ($(event.currentTarget).attr("data-level") ?? "1") as "1" | "5" | "10" | "15" | "20";
            let boosts = actor.system.build.abilities.boosts[level] ?? [];
            if (boosts.includes(ability)) {
                boosts = boosts.filter((a) => a !== ability);
            } else {
                boosts.push(ability);
            }
            await actor.update(
                { [`data.build.abilities.boosts.${level}`]: boosts },
                { diff: false } // arrays are stupid. This is necessary or it doesn't work
            );
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
            ancestry: actor.ancestry,
            background: actor.background,
            class: actor.class,
            ancestryBoosts: this.calculateAncestryBoosts(),
            backgroundBoosts: this.calculateBackgroundBoosts(),
            levelBoosts: this.calculatedLeveledBoosts(),
        };
    }

    private calculateAncestryBoosts(): AncestryBoosts | null {
        const { actor } = this;
        if (!actor.ancestry) return null;

        const ancestryBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: defaultBoostFlawState(),
            }),
            {} as BoostFlawRow
        );

        for (const flaw of Object.values(actor.ancestry.system.flaws)) {
            if (flaw.selected) {
                ancestryBoosts[flaw.selected].lockedFlaw = true;
            }
        }

        let shownBoost = false;
        let boostsRemaining = 0;
        for (const boost of Object.values(actor.ancestry.system.boosts)) {
            if (boost.selected) {
                if (boost.value.length === 1) {
                    ancestryBoosts[boost.selected].lockedBoost = true;
                }
                ancestryBoosts[boost.selected].boosted = true;
                ancestryBoosts[boost.selected].available = true;
            } else if (boost.value.length > 0) {
                boostsRemaining += 1;
                if (!shownBoost) {
                    for (const ability of boost.value) {
                        ancestryBoosts[ability].available = true;
                    }
                    shownBoost = true;
                }
            }
        }

        // Do some house-keeping and make sure they can't do things multiple times
        for (const ability of Array.from(ABILITY_ABBREVIATIONS)) {
            const hasFlaw = ancestryBoosts[ability].lockedFlaw || ancestryBoosts[ability].voluntaryFlaws;

            if (ancestryBoosts[ability].lockedFlaw) {
                ancestryBoosts[ability].canVoluntaryFlaw = false;
            }
            if (ancestryBoosts[ability].boosted && !hasFlaw) {
                ancestryBoosts[ability].canVoluntaryBoost = false;
            }
            if (ancestryBoosts[ability].voluntaryBoost && !ancestryBoosts[ability].lockedFlaw) {
                ancestryBoosts[ability].available = false;
            }
        }

        return {
            boosts: ancestryBoosts,
            remaining: boostsRemaining,
            voluntaryBoostsRemaining: 0,
            labels: this.calculateBoostLabels(actor.ancestry.system.boosts),
            flawLabels: this.calculateBoostLabels(actor.ancestry.system.flaws),
        };
    }

    private calculateBackgroundBoosts(): BackgroundBoosts | null {
        const { actor } = this;
        if (!actor.background) return null;

        const backgroundBoosts: BoostFlawRow = Array.from(ABILITY_ABBREVIATIONS).reduce(
            (accumulated, abbrev) => ({
                ...accumulated,
                [abbrev]: defaultBoostFlawState(),
            }),
            {} as BoostFlawRow
        );
        let boostsRemaining = 0;

        let shownBoost = false;
        for (const boost of Object.values(actor.background.system.boosts)) {
            if (boost.selected) {
                if (boost.value.length === 1) {
                    backgroundBoosts[boost.selected].lockedBoost = true;
                }
                backgroundBoosts[boost.selected].available = true;
                backgroundBoosts[boost.selected].boosted = true;
            } else if (boost.value.length > 0) {
                boostsRemaining += 1;
                if (!shownBoost) {
                    for (const ability of boost.value) {
                        backgroundBoosts[ability].available = true;
                    }
                    shownBoost = true;
                }
            }
        }

        const labels = this.calculateBoostLabels(actor.background.system.boosts);
        const tooltip = ((): string | null => {
            const boosts = actor.background?.system.boosts ?? {};
            if (
                Object.values(boosts).length === 2 &&
                Object.values(boosts)[0].value.length === 2 &&
                Object.values(boosts)[1].value.length === 6
            ) {
                // in the very common case where background boosts are a choice of 2, and a free
                // give it a helpful tooltip
                const choices = Object.values(boosts)[0].value.map((ability) =>
                    game.i18n.localize(CONFIG.PF2E.abilities[ability])
                );
                return game.i18n.format("PF2E.Actor.Character.AbilityBuilder.BackgroundBoostDescription", {
                    a: choices[0],
                    b: choices[1],
                });
            } else {
                return null;
            }
        })();

        return {
            boosts: backgroundBoosts,
            remaining: boostsRemaining,
            labels,
            tooltip,
        };
    }

    private calculatedLeveledBoosts() {
        const build = this.actor.system.build.abilities;
        const isGradual = game.settings.get("pf2e", "gradualBoostsVariant");
        return ([1, 5, 10, 15, 20] as const).reduce(
            (ret: Record<number, LevelBoostData>, level) => ({
                ...ret,
                [level]: {
                    increase: {
                        skills: [...SKILL_ABBREVIATIONS].map((skill) => ({
                            skill,
                            taken: build.skillIncreases[level].includes(skill),
                        })),
                        full: build.skillIncreases[level].length >= build.allowedIncreases[level],
                        eligible: build.allowedIncreases[level] > 0,
                        remaining: build.allowedIncreases[level] - build.skillIncreases[level].length,
                        level,
                    },
                    training: {
                        skills: [...SKILL_ABBREVIATIONS].map((skill) => ({
                            skill,
                            taken: build.skillTraining[level].includes(skill),
                        })),
                        full: build.skillTraining[level].length >= build.allowedTraining[level],
                        eligible: build.allowedTraining[level] > 0,
                        remaining: build.allowedTraining[level] - build.skillTraining[level].length,
                        level,
                    },
                    eligible: build.allowedTraining[level] > 0 || build.allowedIncreases[level] > 0,
                    level: level,
                },
            }),
            {}
        );
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
