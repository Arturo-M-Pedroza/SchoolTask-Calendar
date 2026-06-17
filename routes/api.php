<?php

use App\Http\Controllers\AgentController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Models\Task;
use Illuminate\Support\Facades\Auth;

Route::prefix('agent')->middleware('auth:sanctum')->group(function () {
    Route::post('/auth', [AgentController::class, 'authenticate']);
    Route::get('/tasks', [AgentController::class, 'getTasks']);
    Route::post('/tasks', [AgentController::class, 'createTask']);
    Route::patch('/tasks/{id}/complete', [AgentController::class, 'completeTask']);
    Route::patch('/tasks/{id}', [AgentController::class, 'updateTask']);
});

// Endpoint para obtener/renovar el token
Route::post('/agent/auth', [AgentController::class, 'authenticate']);