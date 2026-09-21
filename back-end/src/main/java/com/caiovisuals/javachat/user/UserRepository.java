package com.caiovisuals.javachat.user;

import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, UUID> {
    /** Login aceita username ou e-mail. Ambos usam os índices funcionais em lower() */
    @Query("select u from User u where lower(u.username) = lower(:login) or lower(u.email) = lower(:login)")
    Optional<User> findByLogin(@Param("login") String login);

    boolean existsByUsernameIgnoreCase(String username);

    boolean existsByEmailIgnoreCase(String email);
}