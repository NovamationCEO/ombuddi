import { ReferralSourceSelectionType } from '../types/majorTypes'

export function referralSelectionsAreValid(selections: ReferralSourceSelectionType[]) {
    return selections.every((selection) => selection.detail === undefined || !!selection.detail.trim())
}
