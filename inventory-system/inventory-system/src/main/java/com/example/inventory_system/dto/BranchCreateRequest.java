package com.example.inventory_system.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public class BranchCreateRequest {
        @NotBlank @Size(min = 3, max = 64)
        private String name;

        @NotBlank @Size(min = 3, max = 128)
        private String address;

        @NotBlank @Pattern(regexp = "^\\d{10,11}$")
        private String phone;

        public BranchCreateRequest() {}
        public BranchCreateRequest(String name, String address, String phone) {
                this.name = name; this.address = address; this.phone = phone;
        }

        public String getName() { return name; }
        public String getAddress() { return address; }
        public String getPhone() { return phone; }

        public void setName(String name) { this.name = name; }
        public void setAddress(String address) { this.address = address; }
        public void setPhone(String phone) { this.phone = phone; }
}
