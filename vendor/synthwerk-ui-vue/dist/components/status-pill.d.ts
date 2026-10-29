export declare const statuses: readonly ["live", "building", "planned", "blocked"];
export type Status = (typeof statuses)[number];
export interface StatusPillProps {
    status: Status;
    disabled?: boolean;
}
/** The current status. Live = success (emerald), building = warning, planned = fg-subtle, blocked = danger. */
export declare const SwStatusPill: import("vue").DefineSetupFnComponent<StatusPillProps, {}, {}, StatusPillProps & {}, import("vue").PublicProps>;
