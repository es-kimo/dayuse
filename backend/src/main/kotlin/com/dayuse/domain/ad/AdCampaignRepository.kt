package com.dayuse.domain.ad

import org.springframework.data.jpa.repository.JpaRepository

interface AdCampaignRepository : JpaRepository<AdCampaign, Long> {

    fun findByCampaignKey(campaignKey: String): AdCampaign?

    fun findAllBySlotTypeOrderByPriorityDescIdAsc(slotType: AdSlotType): List<AdCampaign>

    fun findAllByOrderByPriorityDescIdAsc(): List<AdCampaign>
}
