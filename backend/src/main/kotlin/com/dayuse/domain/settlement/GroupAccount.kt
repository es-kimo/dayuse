package com.dayuse.domain.settlement

import com.dayuse.global.entity.BaseTimeEntity
import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Index
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint

@Entity
@Table(
    name = "group_accounts",
    indexes = [
        Index(name = "idx_group_account_group_id", columnList = "groupId")
    ],
    uniqueConstraints = [
        UniqueConstraint(name = "uk_group_account_group_id", columnNames = ["groupId"])
    ]
)
class GroupAccount(
    id: Long = 0L,

    groupId: Long = 0L,

    @Column(nullable = false, length = 50)
    var bankName: String = "",

    @Column(nullable = false, length = 50)
    var accountNumber: String = "",

    @Column(nullable = false, length = 50)
    var accountHolder: String = ""
) : BaseTimeEntity() {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long = id
        protected set

    @Column(nullable = false)
    var groupId: Long = groupId
        protected set

    fun update(bankName: String, accountNumber: String, accountHolder: String) {
        this.bankName = bankName
        this.accountNumber = accountNumber
        this.accountHolder = accountHolder
    }
}
