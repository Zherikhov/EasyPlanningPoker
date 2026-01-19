package com.easysprintpoker.infrastructure.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * SPA fallback controller: отдаёт index.html для клиентских маршрутов,
 * чтобы прямой переход на /login и /register работал без 404/500.
 * Вся статика лежит в resources/static, поэтому forward на /index.html корректен.
 */
@Controller
public class SpaForwardController {

    @GetMapping({"/login", "/register"})
    public String forwardToIndex() {
        // Важно: используем forward (а не redirect), чтобы отдать файл из static
        return "forward:/index.html";
    }
}
