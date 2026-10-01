package com.dayuse.domain.experiment

import com.dayuse.domain.experiment.service.ExperimentService
import org.slf4j.LoggerFactory
import org.springframework.boot.ApplicationArguments
import org.springframework.boot.ApplicationRunner
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.stereotype.Component

/**
 * 기동 시 [DayuseExperimentDefinitions.SEEDS]의 실험 정의를 멱등하게 등록한다. (v0.10 F09-1)
 *
 * 실험 정의가 없으면 프론트엔드 조회가 매번 `NOT_FOUND` Fallback으로 떨어져 실험을 켤 수조차 없다.
 * 반대로 이미 있는 실험은 절대 건드리지 않는다. 운영 중 `ACTIVE` 실험이 재배포로 `DRAFT`로 되돌아가면
 * 노출이 조용히 멈추기 때문이다.
 *
 * 시드 실패는 로그만 남기고 애플리케이션 기동을 막지 않는다. 실험은 부가 기능이고,
 * 정의가 없어도 모든 사용자는 기본 경험(A)으로 정상 동작한다.
 */
@Component
@ConditionalOnProperty(
    name = ["experiment.seed.enabled"],
    havingValue = "true",
    matchIfMissing = true
)
class ExperimentSeeder(
    private val experimentService: ExperimentService
) : ApplicationRunner {

    private val log = LoggerFactory.getLogger(javaClass)

    override fun run(args: ApplicationArguments?) {
        seed()
    }

    fun seed() {
        for (definition in DayuseExperimentDefinitions.SEEDS) {
            try {
                val experiment = experimentService.ensureExperiment(definition)
                log.info(
                    "Experiment 정의 확인: key={}, status={}, rollout={}%",
                    experiment.experimentKey,
                    experiment.status,
                    experiment.rolloutPercentage
                )
            } catch (ex: Exception) {
                log.warn("Experiment 정의 시드에 실패했습니다: key={}", definition.experimentKey, ex)
            }
        }
    }
}
