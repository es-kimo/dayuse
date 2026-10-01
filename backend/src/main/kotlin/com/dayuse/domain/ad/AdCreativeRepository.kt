package com.dayuse.domain.ad

import org.springframework.data.jpa.repository.JpaRepository

interface AdCreativeRepository : JpaRepository<AdCreative, Long> {

    fun findAllByCampaignIdOrderByIdAsc(campaignId: Long): List<AdCreative>

    fun findAllByCampaignIdAndActiveTrueOrderByIdAsc(campaignId: Long): List<AdCreative>
}
