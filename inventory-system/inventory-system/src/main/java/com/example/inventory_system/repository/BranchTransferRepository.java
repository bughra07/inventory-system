package com.example.inventory_system.repository;

import com.example.inventory_system.domain.BranchTransfer;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BranchTransferRepository extends JpaRepository<BranchTransfer, Long> {

    List<BranchTransfer> findAllByOrderByCreatedAtDesc();
}
