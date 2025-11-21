package com.example.inventory_system.repository;

import com.example.inventory_system.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
    boolean existsByNameIgnoreCase(String name);
}
/*package com.example.inventory_system.repository;

import com.example.inventory_system.domain.Branch;
import org.springframework.data.jpa.repository.JpaRepository;

public interface BranchRepository extends JpaRepository<Branch, Long> {
}
*/