package com.example.inventory_system;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication(scanBasePackages = "com.example.inventory_system")
public class InventorySystemApplication {
	public static void main(String[] args) {
		SpringApplication.run(InventorySystemApplication.class, args);
	}
}
