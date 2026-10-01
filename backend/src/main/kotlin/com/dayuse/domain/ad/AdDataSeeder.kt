package com.dayuse.domain.ad

import com.dayuse.domain.ad.dto.CreateAdCampaignRequest
import com.dayuse.domain.ad.dto.CreateAdCreativeInput
import com.dayuse.domain.ad.service.AdService
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component
import java.time.LocalDateTime

/**
 * 기동 시 기본 dayuse 자체 안내 광고 캠페인·소재를 멱등하게 등록합니다. (v0.11 F07)
 */
@Component
@ConditionalOnProperty(
    name = ["ad.seed.enabled"],
    havingValue = "true",
    matchIfMissing = true
)
class AdDataSeeder(
    private val adService: AdService
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments?) {
        seed()
    }

    fun seed() {
        for (seedRequest in DEFAULT_CAMPAIGN_SEEDS) {
            try {
                val result = adService.ensureSeedCampaign(seedRequest)
                log.info(
                    "AdCampaign 시드 확인: key={}, status={}, priority={}, dailyLimit={}",
                    result.campaignKey,
                    result.status,
                    result.priority,
                    result.dailyImpressionLimit
                )
            } catch (ex: Exception) {
                log.warn("AdCampaign 시드 등록에 실패했습니다: key={}", seedRequest.campaignKey, ex)
            }
        }
    }

    companion object {
        val DEFAULT_CAMPAIGN_SEEDS: List<CreateAdCampaignRequest> = listOf(
            CreateAdCampaignRequest(
                campaignKey = "dayuse-autumn-feature-guide-v1",
                title = "가을 시즌 기능 안내 캠페인 (알림 · 친구 초대 · 데이유 색)",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 20,
                dailyImpressionLimit = 3,
                startAt = LocalDateTime.of(2026, 10, 1, 0, 0),
                endAt = LocalDateTime.of(2026, 12, 31, 23, 59, 59),
                creatives = listOf(
                    CreateAdCreativeInput(
                        title = "자정 전에 데이유가 먼저 알려드려요",
                        description = "알림을 켜 두면 남은 인증이 있는 날에만 정한 시간에 한 번 알려드려요. 바쁜 날에도 루틴이 끊기지 않아요.",
                        imageUrl = "/ads/banners/banner-01-reminder.webp",
                        ctaText = "10초 동안 안내를 확인하면 리데이 티켓 1장이 지급돼요. 알림은 내 정보 › 미인증 알림에서 켤 수 있어요.",
                        minWatchSeconds = 10,
                        active = true
                    ),
                    CreateAdCreativeInput(
                        title = "혼자보다 친구와 할 때 더 오래가요",
                        description = "모임 멤버 탭에서 초대 링크를 카톡으로 보내 보세요. 목표는 달라도 같은 모임에서 서로의 인증을 볼 수 있어요.",
                        imageUrl = "/ads/banners/banner-02-invite.webp",
                        ctaText = "10초 동안 안내를 확인하면 리데이 티켓 1장이 지급돼요. 초대 링크는 모임 › 멤버 탭에 있어요.",
                        minWatchSeconds = 10,
                        active = true
                    ),
                    CreateAdCreativeInput(
                        title = "내 데이유 색, 이제 직접 고를 수 있어요",
                        description = "내 정보에서 프로필 데이유를 눌러 10가지 색 중 하나를 골라 보세요. 모임 피드와 멤버 목록에 바로 반영돼요.",
                        imageUrl = "/ads/banners/banner-03-dayu-color.webp",
                        ctaText = "10초 동안 안내를 확인하면 리데이 티켓 1장이 지급돼요. 내 정보 › 프로필 데이유에서 바꿀 수 있어요.",
                        minWatchSeconds = 10,
                        active = true
                    )
                )
            ),
            CreateAdCampaignRequest(
                campaignKey = "dayuse-reday-guide-default",
                title = "dayuse 리데이 제도 안내 캠페인",
                slotType = AdSlotType.REDAY_TICKET_REWARD,
                status = AdCampaignStatus.ACTIVE,
                priority = 10,
                dailyImpressionLimit = AdCampaign.DEFAULT_DAILY_IMPRESSION_LIMIT,
                startAt = LocalDateTime.of(2026, 1, 1, 0, 0),
                endAt = LocalDateTime.of(2030, 12, 31, 23, 59, 59),
                creatives = listOf(
                    CreateAdCreativeInput(
                        title = "하루 늦었더라도 루틴을 포기하지 마세요",
                        description = "지각 인증 후 리데이 티켓을 사용하면 이번 벌금이 면제돼요. 지각 기록은 투명하게 남고, 모임 루틴은 계속 이어갈 수 있어요.",
                        ctaText = "10초 동안 안내를 확인하면 리데이 티켓 1장이 지급됩니다.",
                        minWatchSeconds = AdCreative.DEFAULT_MIN_WATCH_SECONDS,
                        active = true
                    )
                )
            )
        )
    }
}
